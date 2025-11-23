# pragma version 0.4.3
"""
@license MIT
@author Qunisid
@title DscEngine
@notice 
    Collateral: Exogenous (WETH, WBTC, etc...)
    Minting (Stability) Mechanism: Decentralized (Algorithmic)
    Value (Relative Stability): Anchored (Pegged to USD)
    Collateral Type: Crypto
"""
from interfaces import i_decentralized_stable_coin
from interfaces import AggregatorV3Interface
from ethereum.ercs import IERC20
# from snekmate.tokens import erc20
# from snekmate.auth import ownable as ow
#
# STATE VARIABLES
#
DSC: public(immutable(i_decentralized_stable_coin))
COLLATERAL_TOKENS: public(immutable(address[2]))
ADDITIONAL_FEED_PRECISION: public(constant(uint256)) = 1 * (10 ** 10)
PRECISION: public(constant(uint256)) = 1 * (10 ** 18)
LIQUIDATION_THRESHOLD: public(constant(uint256)) = 50
LIQUIDATION_PRECISION: public(constant(uint256)) = 100
LIQUIDATION_BONUS: public(constant(uint256)) = 10
MIN_HEALTH_FACTOR: public(constant(uint256)) = 1 * (10 ** 18)
#
# STORAGE VARIABLES
#
event CollateralDeposited:
    user: indexed(address)
    amount: indexed(uint256)

event CollateralRedeemed:
    token: indexed(address)
    amount: indexed(uint256)
    _from: address
    _to: address
#
# STORAGE VARIABLES
#
token_to_price_feed: public(HashMap[address,address])
user_to_token_amount_deposited: public(HashMap[address, HashMap[address, uint256]])
user_to_dsc_minted: public(HashMap[address, uint256])

@deploy
def __init__(token_addresses: address[2], price_feed_addresses: address[2],dsc_address: address):
    DSC = i_decentralized_stable_coin(dsc_address)
    COLLATERAL_TOKENS = token_addresses
    self.token_to_price_feed[token_addresses[0]] = price_feed_addresses[0]
    self.token_to_price_feed[token_addresses[1]] = price_feed_addresses[1]
    
#
# EXTERNAL FUNCTIONS
#
@external
def deposit_collateral(token_collateral_address: address, amount_collateral: uint256):
    self._deposit_collateral(token_collateral_address, amount_collateral)

@external
def deposit_collateral_and_mint_dsc(token_collateral_address: address, amount_collateral: uint256, amount_dsc_to_mint: uint256):
    self._deposit_collateral(token_collateral_address, amount_collateral)
    self._mint_dsc(amount_dsc_to_mint)

@external
def mint_dsc(amount: uint256):
    self._mint_dsc(amount)

@external
def redeem_collateral(token_collateral_address: address, amount: uint256):
    self._redeem_collateral(token_collateral_address, amount, msg.sender, msg.sender)
    self._revert_if_health_factor_broken(msg.sender)

@external
def redeem_collateral_for_dsc(token_collateral: address, amount_collateral: uint256, amount_dsc: uint256):
    self._burn_dsc(amount_dsc, msg.sender, msg.sender )
    self._redeem_collateral(token_collateral, amount_collateral, msg.sender, msg.sender )
    self._revert_if_health_factor_broken(msg.sender)

@external
def burn_dsc(amount: uint256):
    self._burn_dsc(amount, msg.sender, msg.sender)
    self._revert_if_health_factor_broken(msg.sender)
    
@external
def liquidate(collateral: address, user: address, debt_to_cover: uint256):
    assert debt_to_cover > 0, "DSCEngine__NeedsMoreThanZero"
    starting_health_factor: uint256 = self._health_factor(user)
    assert starting_health_factor < MIN_HEALTH_FACTOR, "DDSCEngine__HealthFactorOk"
    token_amount_from_debt_covered: uint256 = self._get_token_amount_from_usd(collateral, debt_to_cover)
    bonus_collateral: uint256 = (token_amount_from_debt_covered * LIQUIDATION_BONUS) // LIQUIDATION_PRECISION
    self._redeem_collateral(collateral, token_amount_from_debt_covered + bonus_collateral, user, msg.sender)
    self._burn_dsc(debt_to_cover, user, msg.sender)

    ending_health_factor: uint256 = self._health_factor(user)
    assert ending_health_factor > starting_health_factor, "DSCEngine__HealthFactorNotImproved"
    self._revert_if_health_factor_broken(msg.sender)

#
# EXTERNAL VIEW FUNCTIONS
# 

@external
@view
def get_usd_value(collateral_address: address, amount: uint256) -> uint256:
    return self._get_usd_value(collateral_address, amount) 

@external
@view
def get_collateral_balance_of_user(user: address, token_collateral: address) -> uint256:
    return self.user_to_token_amount_deposited[user][token_collateral]

@external
@view
def get_account_collateral_value(user: address) -> uint256:
    return self._get_account_collateral_value(user)

@external
@view
def get_token_amount_from_usd(token: address, usd_amount_in_wei: uint256) -> uint256:
    return self._get_token_amount_from_usd(token, usd_amount_in_wei)

@external
@view
def get_account_information(user: address) -> (uint256, uint256):
    return self._get_account_information(user)
    
@external
def calculate_health_factor(total_dsc_minted: uint256, total_collateral_value_usd: uint256) -> uint256:
    return self._calculate_health_factor(total_dsc_minted, total_collateral_value_usd)
    
@external
def health_factor(user: address) -> uint256:
    return self._health_factor(user)

@external
@view
def get_collateral_tokens() -> address[2]:
    return COLLATERAL_TOKENS

    



#
# INTERNAL FUNCTIONS
# 
@internal
def _deposit_collateral(token_collateral_address: address, amount_collateral: uint256):
    #Checks
    assert amount_collateral > 0,"DSCEngine_NeedsMoreThanZero"
    assert self.token_to_price_feed[token_collateral_address] != empty(address), "DSCEngine__TokenNotAllowed"

    #Effect
    self.user_to_token_amount_deposited[msg.sender][token_collateral_address] += amount_collateral
    log CollateralDeposited(user=msg.sender, amount=amount_collateral)

    #interactions
    sucess: bool = extcall IERC20(token_collateral_address).transferFrom(msg.sender, self, amount_collateral)
    assert sucess, "DSCEngine_TransferFailed"


@internal
def _redeem_collateral(token_collateral_address: address, amount: uint256, _from: address, _to: address):
    self.user_to_token_amount_deposited[_from][token_collateral_address] -= amount
    log CollateralRedeemed(token=token_collateral_address, amount=amount, _from= _from, _to = _to)
    success: bool = extcall(IERC20(token_collateral_address).transfer(_to, amount))
    assert success, "DDSCEngine_TransferFailed"


@internal
def _mint_dsc(amount_dsc_to_mint: uint256):
    assert amount_dsc_to_mint > 0, "DSCEngine__NeedsMoreThanZero"
    self.user_to_dsc_minted[msg.sender] += amount_dsc_to_mint
    self._revert_if_health_factor_broken(msg.sender)
    extcall DSC.mint(msg.sender, amount_dsc_to_mint)

@internal
@view
def _get_account_information(user: address) -> (uint256, uint256):
    """@notice returns the total DSC minted, and the total collateral value deposited"""
    total_dsc_minted: uint256 = self.user_to_dsc_minted[user]
    collateral_value_in_usd: uint256 = 0 
    for token: address in COLLATERAL_TOKENS:
        amount: uint256 = self.user_to_token_amount_deposited[user][token]
        collateral_value_in_usd += self._get_usd_value(token, amount)
    return total_dsc_minted, collateral_value_in_usd

@internal
@view
def _get_account_collateral_value(user: address) -> uint256:
    """@notice returns the total collateral value deposited"""
    total_collateral_value_usd: uint256 = 0
    for token: address in COLLATERAL_TOKENS:
        amount: uint256 = self.user_to_token_amount_deposited[user][token]
        total_collateral_value_usd += self._get_usd_value(token, amount)
    return total_collateral_value_usd

@internal
@view
def _get_usd_value(token: address, amount: uint256) -> uint256:
    price_feed: AggregatorV3Interface = AggregatorV3Interface(self.token_to_price_feed[token])
    price: int256 = staticcall price_feed.latestAnswer()
    # price: int256 = price_feed.latestAnswer()
    return (convert(price, uint256) * ADDITIONAL_FEED_PRECISION * amount) // PRECISION

@internal
@view
def _get_token_amount_from_usd(token: address, usd_amount_in_wei: uint256) -> uint256:

    price_feed: AggregatorV3Interface = AggregatorV3Interface(self.token_to_price_feed[token])
    price: int256 = staticcall price_feed.latestAnswer()
    return (usd_amount_in_wei * PRECISION) // (convert(price, uint256) * ADDITIONAL_FEED_PRECISION)

@internal
def _health_factor(user: address) -> uint256:
    total_dsc_minted: uint256 = 0 
    total_collateral_value_usd: uint256 = 0 
    total_dsc_minted, total_collateral_value_usd = self._get_account_information(user)
    return self._calculate_health_factor(total_dsc_minted, total_collateral_value_usd)

@internal
def _calculate_health_factor(total_dsc_minted: uint256, total_collateral_value_usd: uint256) -> uint256:
    if total_dsc_minted == 0:
        return max_value(uint256)
    collateral_adjusted_for_threshold: uint256 = (total_collateral_value_usd * LIQUIDATION_THRESHOLD) // LIQUIDATION_PRECISION
    return (collateral_adjusted_for_threshold * PRECISION) // total_dsc_minted 

@internal
def _revert_if_health_factor_broken(user: address):
    user_health_factor: uint256 = self._health_factor(user)
    assert user_health_factor >= MIN_HEALTH_FACTOR, "DSCEngine__BreaksHealthFactor"

@internal
def _burn_dsc(amount: uint256, on_behalf_of: address, dsc_from: address):
    self.user_to_dsc_minted[on_behalf_of] -= amount
    extcall DSC.burn_from(dsc_from, amount)

    
